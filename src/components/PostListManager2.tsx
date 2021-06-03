// Copyright 2021 Alan Tracey Wootton
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import React, { ReactElement, FC, useEffect, useCallback } from "react";
import ReactList from 'react-list';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';

import * as getpostsapi from "../api1/GetPosts"

import * as social from "../server/SocialTypes"
import * as postitem from "./PostItem"
import * as cards from "./CardUtil"
import * as util from "../server/Util"
import * as event from "../api1/Event"
import * as broadcast from "../server/BroadcastDispatcher"
import * as getcommentsapi from "../api1/GetComments"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({

    root: {
      margin: '0 11px',
      border: '0 12px',

      padding: '0 13px',
    },
    wrapper: {
      overflow: 'auto',
      maxHeight: theme.spacing(100 - 6) // fixme: make the Events tab bar < 6 high
    },
    evens: {
    },
    odds: {
      //backgroundColor: 'lightgrey',
    },
  })
);

type Props = {
  message: string;
  folder: string;
  username: string
}

type State = {
  posts: Map<number, social.Post>
  comments: Map<social.StringRef, social.Comment>
  references: social.StringRef[] // sorted newest on top
  opened: Map<social.StringRef, boolean>,
  needsMore: boolean
  needsMoreComments:boolean
  full: boolean
  pending: boolean
  lastDate: social.DateNumber
  random: string
}

const emptyState: State = {
  posts: new Map<number, social.Post>(),
  comments: new Map(),
  opened: new Map(),
  references: [],
  needsMore: true,
  needsMoreComments: true,
  full: false,
  pending: false,
  lastDate: 0,
  random: util.randomString(16)
}

type AuxState = {
  //changed: boolean
  postspending:boolean
  commentspending:boolean

  postsNeeded: boolean //social.DateNumber[]
  commentsNeeded: Set<social.StringRef>

  when: number // in milliseconds so we can clean them up later
  timerId: NodeJS.Timeout | undefined
}

const emptyAux: AuxState = {
  postspending: false,
  commentspending: false,
   
  postsNeeded : false,
  commentsNeeded: new Set(),
  when: util.getMilliseconds(),
  timerId: undefined
}

var auxMap: Map<string, AuxState> = new Map()

export const PostListManager2: FC<Props> = (props: Props): ReactElement => {

  // need a mapping from ordinal index of the item to the post.id and then to the post

  const [state, setState] = React.useState(emptyState)

  const tmpaux: AuxState | undefined = auxMap.get(state.random)
  if (tmpaux === undefined) {
    const newaux: AuxState = {
      ...emptyAux,
      when: util.getMilliseconds(),
    }
    auxMap.set(state.random, newaux)
  }
  var auxState: AuxState = auxMap.get(state.random) || emptyAux

  console.log("PostListManager2 redraw", state.random)

  const handleEvent = (event: event.EventCmd) => {
    //console.log("PostListManager2 have event", event, event.who, props.username,dates.length)
    // FIXME: optimise. Don't refresh everything.
    if (event.what.cmd === 'DeletePost' && event.who === props.username) { //event.what.cmd
      console.log("PostListManager2 have delete event", event, event.who, props.username)
      // delete it directly
      // const deleteCmd : deletepostapi.DeletePostCmd = event.what as deletepostapi.DeletePostCmd
      // var newPosts = clonePosts(state.posts)
      // newPosts.delete(deleteCmd.id)
      //var newDates = getDates(newPosts)
      //setDates(newDates)
      //setPosts(newPosts)
      // setDates([]) // FIXME: a cop out and ugly
      // setPosts(new Map())// FIXME: a cop out and ugly
      // loadMore(util.getCurrentDateNumber())// FIXME: a cop out and ugly
      console.log("DeletePost setState")
      setState(emptyState)

    } else if (event.what.cmd === 'SavePost' && event.who === props.username) { //event.what.cmd
      console.log("PostListManager2 have SavePost event", event, event.who, props.username, state.references.length)
      //const saveCmd : savepostapi.SavePostCmd = event.what as savepostapi.SavePostCmd
      //loadMore(ssaveCmd util.getCurrentDateNumber())
      // don't load - we have it
      // var newPosts = clonePosts(posts)
      // newPosts.set(saveCmd.post.id, saveCmd.post)
      // var newDates = getDates(newPosts)
      // dates.push(saveCmd.post.id)
      // var sortedArray: number[] = dates.sort((n1, n2) => n2 - n1);
      // posts.set(saveCmd.post.id, saveCmd.post)
      // setDates(newDates)
      // setPosts(newPosts)
      // setDates([]) // FIXME: a cop out and ugly
      // setPosts(new Map())// FIXME: a cop out and ugly
      //loadMore(util.getCurrentDateNumber(),1)// FIXME: a cop out and ugly
      console.log("SavePost setState")
      setState(emptyState)
    } else if (event.what.cmd === 'IncrementLikes' && event.who === props.username) { //event.what.cmd
      console.log("PostListManager2 have SavePost event", event, event.who, props.username, state.references.length)
      setState(emptyState)
    } else {
      // this is not really an error. The save general info broadcasts go through here.
      //console.log("ERROR PostListManager2 handleEvent unkn own event",event.what.cmd )
    }
  }

  // const subscribeEffect = () => {
  //   //console.log("PostListManager2 subscribe folder,user,count", props.folder,props.username, dates.length)
  //   broadcast.Subscribe(props.username, props.folder + props.username, handleEvent.bind(this))
  //   return () => {
  //     //console.log("PostListManager2 UNsubscribe folder,user,count", props.folder,props.username, dates.length)
  //     broadcast.Unsubscribe(props.username, props.folder + props.username)
  //   };
  // }

  //console.log("PostListManager2 rendering len = ", state.dates.length, util.getSecondsDisplay())

  useEffect(() => {
    //console.log("PostListManager2 subscribe folder,user,count", props.folder,props.username, dates.length)
    broadcast.Subscribe(props.username, props.folder + props.username + state.random, handleEvent.bind(this))
    return () => {
      //console.log("PostListManager2 UNsubscribe folder,user,count", props.folder,props.username, dates.length)
      broadcast.Unsubscribe(props.username, props.folder + props.username + state.random)
    };
  }, [state]);

  // const setTimer = () => {
  //   if (timerId === undefined && ! full) {
  //     let t: NodeJS.Timeout = setTimeout(() => {
  //       // timerId = undefined
  //       loadMore()
  //     }, 100)
  //     timerId = t
  //   }
  // }

  // we would like to only call this once and never until after it's done.
  const loadMore = (aStart?: social.DateNumber, howMany?: number) => {

    if (state.needsMore === false || state.pending === true) { // this is shit. TODO: sort it out.
      return
    }
    var startDate = util.getCurrentDateNumber()
    if (state.references.length !== 0) {
      const r = social.StringRefToRef(state.references[state.references.length - 1])
      startDate = r.id
    }
    startDate = aStart || startDate

    if (startDate === state.lastDate) {
      return
    }
    var newState: State = {
      ...state,
      pending: true,
      lastDate: startDate
    }

    console.log("loadMore top setState")
    setState(newState)

    const top = "" + startDate
    const fold = props.folder // eg. "lists/posts/"
    const count = howMany || 6
    const old = ""

    console.log("calling loadMore in PostListManager2 dates,startdate ", state.references.length, startDate, util.getSecondsDisplay())

    getpostsapi.IssueTheCommand(props.username, top, fold, count, old, gotMorePosts.bind(this))
  }


  const gotMoreComments = ( comments: social.Comment[], error: any) => {

    console.log("gotMoreComments top setState", comments)

    const newState : State = {
      ...state,
      needsMoreComments : false
    }
    setState(newState)
  }


  const loadMoreComments = () => {

    if ( auxState.commentsNeeded.size === 0 || state.needsMoreComments == false){
      return 
    }
    if (auxState.commentspending) {
      return 
    }

    console.log("loadMoreComments top setState")

    var needList : social.Reference[] = []
    for ( var ref in  auxState.commentsNeeded.values ){
      needList.push(social.StringRefToRef(ref))
    }
    console.log("loading comments !!!  ",needList)
    if ( needList.length > 0 ) {
      getcommentsapi.IssueTheCommand( needList , gotMoreComments.bind(this))
    } else {
      auxState.commentspending = false
      const newState : State = {
        ...state,
        needsMoreComments : false
      }
      setState(newState)
    }
  }

  //const loadMoreCallback = useCallback(() => { loadMore() }, [])

  useEffect(() => {

  if (  auxState.postspending===false && auxState.postsNeeded && !state.full){
    auxState.postspending = true
    console.log("PostListManager2 aux loadmore ")
    loadMore()
  }

  if ( auxState.commentsNeeded.size > 0 && auxState.commentspending === false){
    loadMoreComments()
  }

} ) // always

  // call load more as necessary
  useEffect(() => {
    //console.log("PostListManager2 will loadMore, needsMore=", needsMore)
    if (state.needsMore) {
      loadMore()
    }
    //setTimer()
    // listen for events that may affect us.

  }, [state.needsMore])


  const gotMorePosts = (postslist: social.Post[], countRequested: number, error: any) => {

    console.log("ReactListTest gotMorePosts just got back from issueTheCommand ")
    auxState.postsNeeded = false
    auxState.postspending = false

    var newState2: State = {
      ...state,
      pending: false,
      needsMore: false
    }
    if (error) {
      console.log("getpostsapi.IssueTheCommand had an error ", error)
    } else {

      let newPosts = clonePosts(newState2.posts)
      // merge in the new ones
      for (var post of postslist) {
        newPosts.set(post.id, post)
      }
      var postids = getSortedIdsFromPosts(newPosts)

      if (postslist.length !== countRequested) {
        newState2.full = true
      }

      // let's calculate references now.
      var refs: social.StringRef[] = []
      for (var id of postids) {
        const reference: social.Reference = {
          id: id,
          by: props.username
        }
        const ref = social.StringRefNew(reference)
        refs.push(ref)
        const isOpened = state.opened.get(ref) || false
        if (isOpened) {
          // push refs for the comments, FIXME: recurse. keep track of level.
          // do we have the post? 
          const post: social.Post = newPosts.get(id) || social.emptyPost
          for (var commentRef of post.comments) {
            refs.push(commentRef)
            // check for if they are loaded and clicked open
          }
        }
      }
      newState2.references = refs
      newState2.posts = newPosts

    }// else no error
    //console.log("loadMore bottom setState")
    setState(newState2)
  }

  const recalculate = (newOpenMap: Map<string, boolean>) => {

    console.log("ReactListTest recalculate ")

    var newState2: State = {
      ...state,
      pending: false,
      needsMore: false,
      opened: newOpenMap
    }
    let newPosts = clonePosts(newState2.posts)
    // merge in the new ones
    var postids = getSortedIdsFromPosts(newPosts)

    // let's calculate references now.
    var refs: social.StringRef[] = []
    for (var id of postids) {
      const reference: social.Reference = {
        id: id,
        by: props.username
      }
      const ref = social.StringRefNew(reference)
      refs.push(ref)
      const isOpened = newOpenMap.get(ref) || false
      if (isOpened) {
        // push refs for the comments, FIXME: recurse. keep track of level.
        // do we have the post? 
        const post: social.Post = newPosts.get(id) || social.emptyPost
        for (var commentRef of post.comments) {
          refs.push(commentRef)
          // check for if they are loaded and clicked open
        }
      }
    }
    newState2.references = refs
    newState2.posts = newPosts
    newState2.opened = newOpenMap
    setState(newState2)
  }


  //const loadMoreDebounced = useCallback(debounce( loadMore ,1000),[needsMore])

  // const loadMoreDebounced = useCallback(
  //   () => {
  //     loadMore();
  //   },
  //   [],
  // );

  // if ( needsLoad ) {
  //   loadMore() 
  //   // setNeedsLoad(false)
  //   console.log(" needsload  needsload  needsload  needsload  needsload " )
  // }

  // const renderVariableHeightItem  = (index: number, key: number | string): JSX.Element => {
  //   return renderItem(index, key)
  // }


  // const setNeedsMore = useCallback(() => { 
  //  if (state.needsMore === false && localNeedsTest === false){
  //   var newState:State = {
  //     ...state,
  //     needsMore :true,
  //   }
  //   console.log("renderItem setState")
  //   localNeedsTest = true
  //   setState(newState) 
  //   }
  // },[])

  // this is called from renderItem which is when the eract-list is udating.
  // and that makes react mad. So, a timer
  const setNeedsMore2 = () => {
    {
      // setInterval( () => {
      var newState: State = {
        ...state,
        needsMore: true,
      }
      console.log("renderItem 2 setNeedsMore2 setState")
      setState(newState)
      //   },100)
    }
  }

  const setNeedsMore3 = () => {
    {
      // setInterval( () => {
      var newState: State = {
        ...state,
        needsMore: true,
      }
      console.log("renderItem 2 setNeedsMore2 setState")
      setState(newState)
      //   },100)
    }
  }

  const setNeedsMoreComments = () => {
    {
      // setInterval( () => {
      var newState: State = {
        ...state,
        needsMore: true,
      }
      console.log("renderItem 2 setNeedsMore2 setState")
      setState(newState)
      //   },100)
    }
  }




  const toggleOpened = (ref: social.StringRef) => {
    console.log("renderItem 2 toggleOpened")
    const open: boolean = state.opened.get(ref) || false
    var newMap = cloneOpenedMap(state.opened)
    newMap.set(ref,!open)
    recalculate(newMap)
  }

  const renderItem = (index: number, key: number | string): JSX.Element => {

    var post = cards.makeTopCard(props.username)
    var isComment: number = 0
    var isOpen = false
    if (index < state.references.length) {
      const ref = state.references[index]
      const reference = social.StringRefToRef(ref)
      if (reference.by === props.username) {
        post = state.posts.get(reference.id) || post
      } else {
        post = state.comments.get(ref) || post
        isComment = 1
        if (state.comments.get(ref) == undefined) {
          auxState.commentsNeeded.add(ref)
          post.theText = "Loading comment by " + reference.by + ". Who might be offline."
          setNeedsMoreComments()
        }
      }
      const got = state.opened.get(ref)
      isOpen = got || isOpen
    } else {
      // off the end
      post.theText = ""  //  "index # " + index + " key " + key
      post.title = ""
      post.id = 0
      // can we suppress the menu?
      // need to load more
      //setTimer()
      //aux.changed = true
      auxState.postsNeeded = true
      // need to trigger 
      if (!state.full && !state.needsMore) {
        setNeedsMore3()
      }
    }
    var evens = classes.evens
    var odds = classes.odds
    return (

      <div
        key={key}
        className={(index % 2 ? odds : evens)}
      >
        <postitem.PostItem post={post} username={props.username} commentsOpen={isOpen} toggleOpened={toggleOpened} isComment={isComment} ></postitem.PostItem>
      </div>
    )
  }

  var listLength = state.references.length + 1
  if (listLength === 0) {
    listLength = 100
  }

  const classes = useStyles()
  var dom = (
    <div className={classes.wrapper} >
      <ReactList
        itemRenderer={renderItem.bind(this)}
        length={listLength}
        type='uniform'
      />
    </div>
  );
  return dom

}

const getSortedIdsFromPosts = (somePosts: Map<number, social.Post>): social.DateNumber[] => {
  var theDates = somePosts.keys()
  var datesArray = Array.from(theDates)
  var sortedArray: number[] = datesArray.sort((n1, n2) => n2 - n1);
  return sortedArray
}

const clonePosts = (somePosts: Map<number, social.Post>): Map<number, social.Post> => {
  let newPosts: Map<number, social.Post> = new Map()// shit don work: Array.from(posts.entries())  );
  somePosts.forEach((value: social.Post, key: number) => {
    newPosts.set(key, value)
  });
  return newPosts
}

const cloneOpenedMap = (oldmap: Map<social.StringRef, boolean>): Map<social.StringRef, boolean> => {
  let newmap: Map<social.StringRef, boolean> = new Map()// shit don work: Array.from(posts.entries())  );
  oldmap.forEach((value: boolean, key: social.StringRef) => {
    newmap.set(key, value)
  });
  return newmap
}
